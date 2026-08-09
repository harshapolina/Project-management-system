import { useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { ProjectPicker } from '../../components/ProjectPicker'
import { colors, spacing, typography } from '../../constants/theme'
import { financeApi } from '../../api/finance'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'CreateExpense'>

export function CreateExpenseScreen({ route, navigation }: Props) {
  const params = route.params || {}
  const queryClient = useQueryClient()
  const [projectId, setProjectId] = useState(params.projectId)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      financeApi.createExpense({
        projectId: projectId!,
        amount: Number(amount),
        category: category.trim() || undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
      navigation.goBack()
    },
    onError: (err) => setError(isApiError(err) ? err.message : 'Could not submit expense'),
  })

  return (
    <Screen keyboardAvoiding>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        {!params.projectId ? <ProjectPicker value={projectId} onChange={(id) => setProjectId(id)} /> : null}
        <Input label="Amount" placeholder="0" keyboardType="numeric" value={amount} onChangeText={setAmount} />
        <Input label="Category (optional)" placeholder="Materials" value={category} onChangeText={setCategory} />
        <Input label="Note (optional)" value={note} onChangeText={setNote} multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Submit expense"
          onPress={() => {
            if (!projectId) {
              setError('Select a project')
              return
            }
            if (!(Number(amount) > 0)) {
              setError('Enter a valid amount')
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
