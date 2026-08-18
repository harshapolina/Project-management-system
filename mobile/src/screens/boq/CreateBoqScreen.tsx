import { useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { ProjectPicker } from '../../components/ProjectPicker'
import { colors, spacing, typography } from '../../constants/theme'
import { boqApi } from '../../api/boq'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'CreateBoq'>

export function CreateBoqScreen({ route, navigation }: Props) {
  const params = route.params || {}
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState(params.projectId)
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => boqApi.create({ title: title.trim(), projectId }),
    onSuccess: (quotation) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      navigation.replace('BoqDetail', { quotationId: quotation._id })
    },
    onError: (err) => setError(isApiError(err) ? err.message : 'Could not create quotation'),
  })

  return (
    <Screen keyboardAvoiding>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <Input label="Title" placeholder="e.g. Sharma Penthouse — Quotation" value={title} onChangeText={setTitle} />
        {!params.projectId ? (
          <ProjectPicker value={projectId} onChange={(id) => setProjectId(id)} />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Create quotation"
          onPress={() => {
            if (!title.trim()) {
              setError('Title is required')
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
