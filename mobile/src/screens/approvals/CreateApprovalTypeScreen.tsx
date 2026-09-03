import { useMemo, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { approvalsApi } from '../../api/approvals'
import { isApiError } from '../../api/client'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'CreateApprovalType'>

export function CreateApprovalTypeScreen({ navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const queryClient = useQueryClient()

  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      approvalsApi.createType({
        label: label.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
      navigation.goBack()
    },
    onError: (err) =>
      setError(isApiError(err) ? err.message : 'Could not add this approval type'),
  })

  return (
    <FormLayout
      title="New approval type"
      subtitle="A process of your own"
      subtitleIcon="add-circle-outline"

      footer={
        <Button
          title="Add type"
          onPress={() => {
            if (!label.trim()) {
              setError('Give the type a name')
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
      <Text style={styles.blurb}>
        For something the app doesn&rsquo;t model yet — a site indent, a leave
        request, a change order. Custom types have no amount, so their routing
        applies to every one of them.
      </Text>

      <Input
        label="Name"
        value={label}
        onChangeText={setLabel}
        placeholder="e.g. Site material indent"
      />
      <Input
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="What it covers"
      />

      {!!error && <Text style={styles.error}>{error}</Text>}
    </FormLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    blurb: {
      ...typography.caption,
      color: c.textSecondary,
      lineHeight: 19,
      marginBottom: spacing.sm,
    },
    error: { ...typography.caption, color: c.danger, marginTop: spacing.md },
  })
}
