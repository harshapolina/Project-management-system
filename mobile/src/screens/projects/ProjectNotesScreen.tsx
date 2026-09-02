import { NestedChrome } from '../../components/NestedChrome'
import { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { TAB_BAR_CLEARANCE } from '../../components/GlassyTabBar'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
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
  const colors = useColors()
  const { listContent, pagePadding } = useResponsive()
  const styles = useMemo(() => createStyles(colors, pagePadding), [colors, pagePadding])

  const { projectId, projectName } = route.params
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [text, setText] = useState('')

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

  const chromeProps = {
    title: "Notes",
    subtitle: projectName || 'Meeting notes',
    subtitleIcon: 'chatbubble-ellipses-outline' as const,
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
      <LoadingState label="Loading notes…" variant="list" />
      </NestedChrome>
    )
  }
  if (isError || !data) {
    return (
      <NestedChrome {...chromeProps}>
      <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </NestedChrome>
    )
  }

  const notes = [...(data.project.meetingNotes || [])].reverse()

  return (
    <NestedChrome {...chromeProps} keyboardAvoiding>
        <FlatList
          data={notes}
          keyExtractor={(n) => n._id}
          contentContainerStyle={[listContent, styles.listGrow]}
          ListHeaderComponent={notes.length > 0 ? <SectionLabel count={notes.length}>Notes</SectionLabel> : null}
          renderItem={({ item }) => {
            const canDelete = item.createdBy === user?.id
            return (
              <SurfaceCard>
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
              </SurfaceCard>
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
    </NestedChrome>
  )
}

function createStyles(c: AppColors, pagePadding: number) {
  return StyleSheet.create({
    listGrow: { flexGrow: 1 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    author: { ...typography.captionStrong, color: c.textPrimary },
    date: { ...typography.micro, color: c.textMuted },
    text: { ...typography.body, color: c.textPrimary },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 4 },
    deleteText: { ...typography.micro, color: c.danger },
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
