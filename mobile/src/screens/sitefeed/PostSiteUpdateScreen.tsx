import { useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { ProjectPicker } from '../../components/ProjectPicker'
import { colors, spacing, typography } from '../../constants/theme'
import { siteFeedApi } from '../../api/siteFeed'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { SharedOpsParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<SharedOpsParamList, 'PostSiteUpdate'>

export function PostSiteUpdateScreen({ route, navigation }: Props) {
  const params = route.params || {}
  const queryClient = useQueryClient()
  const [projectId, setProjectId] = useState(params.projectId)
  const [note, setNote] = useState('')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      siteFeedApi.postUpdate({
        projectId: projectId!,
        note: note.trim(),
        progress: progress ? Number(progress) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-updates'] })
      navigation.goBack()
    },
    onError: (err) => setError(isApiError(err) ? err.message : 'Could not post update'),
  })

  return (
    <Screen keyboardAvoiding>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        {!params.projectId ? <ProjectPicker value={projectId} onChange={(id) => setProjectId(id)} /> : null}
        <Input
          label="Update"
          placeholder="What's happening on site?"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={4}
          style={{ minHeight: 96, textAlignVertical: 'top' }}
        />
        <Input label="Progress % (optional)" placeholder="0-100" keyboardType="numeric" value={progress} onChangeText={setProgress} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Post update"
          onPress={() => {
            if (!projectId) {
              setError('Select a project')
              return
            }
            if (!note.trim()) {
              setError('Write an update first')
              return
            }
            setError('')
            mutation.mutate()
          }}
          loading={mutation.isPending}
          fullWidth
        />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: spacing.xxl },
  error: { ...typography.caption, color: colors.danger },
})
