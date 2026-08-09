import { useLayoutEffect, useState } from 'react'
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { projectsApi } from '../../api/projects'
import { notesApi } from '../../api/notes'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProjectStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProjectStackParamList, 'ProjectNotes'>

function formatDate(date: string) {
  return new Date(date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function ProjectNotesScreen({ route, navigation }: Props) {
  const { projectId, projectName } = route.params
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [text, setText] = useState('')

  useLayoutEffect(() => {
    navigation.setOptions({ title: projectName ? `${projectName} · Notes` : 'Meeting notes' })
  }, [navigation, projectName])

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
  })

  const addMutation = useMutation({
    mutationFn: (noteText: string) => notesApi.add(projectId, noteText),
    onSuccess: () => {
      setText('')
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (noteId: string) => notesApi.remove(projectId, noteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
  })

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading notes…" />
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

  const notes = [...(data.project.meetingNotes || [])].reverse()

  return (
    <Screen padded={false} keyboardAvoiding>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={notes}
          keyExtractor={(n) => n._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const canDelete = item.createdBy === user?.id
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.author}>{item.createdByName}</Text>
                  <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                </View>
                <Text style={styles.text}>{item.text}</Text>
                {canDelete ? (
                  <Pressable onPress={() => removeMutation.mutate(item._id)} hitSlop={8} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={14} color={colors.danger} />
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                ) : null}
              </View>
            )
          }}
          ListEmptyComponent={<EmptyState title="No notes yet" body="Capture meeting takeaways here." />}
        />

        <View style={styles.composer}>
          <Input placeholder="Add a note…" value={text} onChangeText={setText} containerStyle={{ flex: 1 }} multiline />
          <Button
            title="Post"
            size="sm"
            onPress={() => text.trim() && addMutation.mutate(text.trim())}
            loading={addMutation.isPending}
            disabled={!text.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  author: { ...typography.captionStrong, color: colors.textPrimary },
  date: { ...typography.micro, color: colors.textMuted },
  text: { ...typography.body, color: colors.textPrimary },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 4 },
  deleteText: { ...typography.micro, color: colors.danger },
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
