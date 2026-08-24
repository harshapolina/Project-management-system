import { useMemo, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { ProjectPicker } from '../../components/ProjectPicker'
import { typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { boqApi } from '../../api/boq'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'CreateBoq'>

export function CreateBoqScreen({ route, navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
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
    <FormLayout
      title="New quotation"
      subtitle="Start a BOQ estimate"
      subtitleIcon="document-text-outline"
      onBack={() => navigation.goBack()}
      footer={
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
      }
    >
      <Input
        label="Title"
        placeholder="e.g. Sharma Penthouse — Quotation"
        value={title}
        onChangeText={setTitle}
      />
      {!params.projectId ? <ProjectPicker value={projectId} onChange={(id) => setProjectId(id)} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </FormLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    error: { ...typography.caption, color: c.danger },
  })
}
