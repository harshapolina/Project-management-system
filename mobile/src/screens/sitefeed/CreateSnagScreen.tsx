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
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'CreateSnag'>

export function CreateSnagScreen({ route, navigation }: Props) {
  const params = route.params || {}
  const queryClient = useQueryClient()
  const [projectId, setProjectId] = useState(params.projectId)
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => siteFeedApi.createSnag({ projectId: projectId!, title: title.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snags'] })
      navigation.goBack()
    },
    onError: (err) => setError(isApiError(err) ? err.message : 'Could not log snag'),
  })

  return (
    <Screen keyboardAvoiding>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        {!params.projectId ? <ProjectPicker value={projectId} onChange={(id) => setProjectId(id)} /> : null}
        <Input label="Issue" placeholder="e.g. Chipped tile in master bath" value={title} onChangeText={setTitle} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Log snag"
          onPress={() => {
            if (!projectId) {
              setError('Select a project')
              return
            }
            if (!title.trim()) {
              setError('Describe the issue')
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
